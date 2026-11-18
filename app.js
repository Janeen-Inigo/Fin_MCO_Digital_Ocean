const contractAddress = "0x08DE5780Ce27a15F56bAC7a1458BB0eE8AA31FAf";

const contractABI = [
  "function addCandidate(string name, string position)",
  "function authorizeVoter(address voter)",
  "function startElection()",
  "function endElection()",
  "function vote(uint256 candidateId)",
  "function getCandidate(uint256 candidateId) view returns (tuple(uint256 id, string name, string position, uint256 voteCount, bool exists))",
  "function getCandidateCount() view returns (uint256)",
  "function getTotalVotes() view returns (uint256)",
  "function getElectionStatus() view returns (bool)"
];

let provider;
let signer;
let contract;
let userAccount;

const connectButton = document.getElementById("connectButton");
const walletStatus = document.getElementById("walletStatus");
const electionStatus = document.getElementById("electionStatus");
const totalVotes = document.getElementById("totalVotes");
const candidateList = document.getElementById("candidateList");

connectButton.addEventListener("click", connectWallet);
document.getElementById("addCandidateButton").addEventListener("click", addCandidate);
document.getElementById("authorizeVoterButton").addEventListener("click", authorizeVoter);
document.getElementById("startElectionButton").addEventListener("click", startElection);
document.getElementById("endElectionButton").addEventListener("click", endElection);

async function connectWallet() {
  if (!window.ethereum) {
    walletStatus.innerText = "Please install MetaMask.";
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  signer = provider.getSigner();
  userAccount = await signer.getAddress();

  contract = new ethers.Contract(contractAddress, contractABI, signer);

  walletStatus.innerText =
    "Connected: " + userAccount.slice(0, 6) + "..." + userAccount.slice(-4);

  loadElectionData();
}

async function addCandidate() {
  const name = document.getElementById("candidateName").value;
  const position = document.getElementById("candidatePosition").value;

  try {
    const tx = await contract.addCandidate(name, position);
    await tx.wait();
    loadElectionData();
  } catch (error) {
    alert("Only the election admin can add candidates.");
  }
}

async function authorizeVoter() {
  const voter = document.getElementById("voterAddress").value;

  try {
    const tx = await contract.authorizeVoter(voter);
    await tx.wait();
    alert("Voter authorized.");
  } catch (error) {
    alert("Only the election admin can authorize voters.");
  }
}

async function startElection() {
  try {
    const tx = await contract.startElection();
    await tx.wait();
    loadElectionData();
  } catch (error) {
    alert("Could not start election.");
  }
}

async function endElection() {
  try {
    const tx = await contract.endElection();
    await tx.wait();
    loadElectionData();
  } catch (error) {
    alert("Could not end election.");
  }
}
/*
async function vote(candidateId) {
  try {
    const tx = await contract.vote(candidateId);
    await tx.wait();
    loadElectionData();
  } catch (error) {
    alert("Voting failed. You may not be authorized or may have already voted.");
  }
}
*/
async function loadElectionData() {
  if (!contract) return;

  const isOpen = await contract.getElectionStatus();
  const count = await contract.getCandidateCount();
  const votes = await contract.getTotalVotes();

  electionStatus.innerText = isOpen
    ? "Election is OPEN"
    : "Election is CLOSED";

  totalVotes.innerText = "Total votes: " + votes.toString();

  candidateList.innerHTML = "";

  for (let i = 1; i <= count.toNumber(); i++) {
    const candidate = await contract.getCandidate(i);

    const div = document.createElement("div");
    div.className = "candidate";
    div.innerHTML = `
      <strong>${candidate.name}</strong><br />
      Position: ${candidate.position}<br />
      Votes: ${candidate.voteCount}<br />
    `;
/*
    if (isOpen) {
      const voteButton = document.createElement("button");
      voteButton.innerText = "Vote";
      voteButton.addEventListener("click", () => vote(candidate.id));
      div.appendChild(voteButton);
    }
*/
    candidateList.appendChild(div);
  }
}
