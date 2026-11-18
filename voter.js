const contractAddress = "0x08DE5780Ce27a15F56bAC7a1458BB0eE8AA31FAf";

const contractABI = [
  "function owner() view returns (address)",
  "function authorizedVoters(address) view returns (bool)",
  "function hasVoted(address) view returns (bool)",
  "function vote(uint256)",
  "function getCandidateCount() view returns (uint256)",
  "function getCandidate(uint256) view returns (tuple(uint256 id, string name, string position, uint256 voteCount, bool exists))",
  "function getTotalVotes() view returns (uint256)",
  "function getElectionStatus() view returns (bool)"
];

let provider, signer, contract, userAccount;
const $ = id => document.getElementById(id);

$("connectButton").onclick = connectWallet;
$("registrationForm").onsubmit = registerVoter;
$("loginButton").onclick = loginVoter;
$("logoutButton").onclick = logout;

$("showLogin").onclick = () => show("loginSection");
$("showRegistration").onclick = () => show("registrationSection");

function show(section) {
  ["registrationSection", "loginSection", "dashboardSection"]
    .forEach(id => $(id).style.display = id === section ? "block" : "none");
}

async function connectWallet() {
  try {
    if (!window.ethereum) throw Error("Install MetaMask first.");

    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);

    signer = provider.getSigner();
    userAccount = await signer.getAddress();

    const network = await provider.getNetwork();
    if (network.chainId !== 11155111)
      throw Error("Please connect to Sepolia.");

    contract = new ethers.Contract(contractAddress, contractABI, signer);

    const status = "Connected: " + userAccount.slice(0, 6) + "..." + userAccount.slice(-4);
    $("walletStatus").innerText = status;
    $("loginWalletStatus").innerText = status;

    $("connectButton").disabled = true;
    $("registrationForm").querySelector("button").disabled = false;
    $("loginButton").disabled = false;

  } catch (error) {
    alert(error.reason || error.message);
  }
}

function registerVoter(e) {
  e.preventDefault();

  if (!userAccount) return alert("Connect your wallet first.");

  const voter = {
    name: $("fullName").value.trim(),
    studentId: $("studentId").value.trim(),
    email: $("email").value.trim()
  };

  if (!voter.name || !voter.studentId || !voter.email)
    return $("registrationMessage").innerText = "Complete all fields.";

  localStorage.setItem("voter_" + userAccount.toLowerCase(), JSON.stringify(voter));

  $("registrationForm").reset();
  show("loginSection");
  $("loginMessage").innerText = "Registration successful! You can now login.";
}

async function loginVoter() {
  try {
    if (!contract) return alert("Connect your wallet first.");

    const voter = JSON.parse(localStorage.getItem("voter_" + userAccount.toLowerCase()));
    if (!voter) throw Error("Please register first.");

    const owner = await contract.owner();
    if (userAccount.toLowerCase() === owner.toLowerCase())
      throw Error("Admin cannot login as a voter.");

    if (!(await contract.authorizedVoters(userAccount)))
      throw Error("Your wallet is not authorized.");

    sessionStorage.setItem("voterLoggedIn", userAccount);

    $("displayName").innerText = voter.name;
    $("displayStudentId").innerText = voter.studentId;

    show("dashboardSection");
    await loadDashboard();

  } catch (error) {
    $("loginMessage").innerText = error.reason || error.message;
  }
}

async function loadDashboard() {
  try {
    const open = await contract.getElectionStatus();
    const voted = await contract.hasVoted(userAccount);

    $("electionStatus").innerText = open ? "Election is OPEN" : "Election is CLOSED";
    $("totalVotes").innerText = "Total votes: " + await contract.getTotalVotes();
    $("voterStatus").innerText = voted ? "Already voted." : "Not voted yet.";

    const list = $("candidateList");
    list.innerHTML = "";

    const count = await contract.getCandidateCount();

    for (let i = 1; i <= count.toNumber(); i++) {
      const c = await contract.getCandidate(i);
      const div = document.createElement("div");
      div.className = "candidate";

      div.innerHTML = `
        <strong>${escapeHTML(c.name)}</strong>
        <p>Position: ${escapeHTML(c.position)}</p>
        <p>Votes: ${c.voteCount.toString()}</p>
      `;

      if (open && !voted) {
        const btn = document.createElement("button");
        btn.innerText = "Vote";
        btn.onclick = () => castVote(c.id);
        div.appendChild(btn);
      }

      list.appendChild(div);
    }

  } catch (error) {
    $("votingMessage").innerText = error.reason || error.message;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]
  );
}

async function castVote(id) {
  try {
    if (!(await contract.authorizedVoters(userAccount)))
      throw Error("Not authorized.");

    if (await contract.hasVoted(userAccount))
      throw Error("You already voted.");

    if (!(await contract.getElectionStatus()))
      throw Error("Election is closed.");

    if (!confirm("Are you sure you want to vote?")) return;

    $("votingMessage").innerText = "Submitting vote...";

    const tx = await contract.vote(id);
    await tx.wait();

    $("votingMessage").innerText = "Vote successfully recorded!";
    await loadDashboard();

  } catch (error) {
    $("votingMessage").innerText = error.reason || error.message;
  }
}

function logout() {
  sessionStorage.removeItem("voterLoggedIn");
  show("loginSection");
  $("votingMessage").innerText = "";
}

window.ethereum?.on("accountsChanged", () => location.reload());
window.ethereum?.on("chainChanged", () => location.reload());
