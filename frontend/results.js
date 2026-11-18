const contractAddress = "0x08DE5780Ce27a15F56bAC7a1458BB0eE8AA31FAf";

const contractABI = [
    "function getCandidate(uint256 candidateId) view returns (tuple(uint256 id, string name, string position, uint256 voteCount, bool exists))",
    "function getCandidateCount() view returns (uint256)",
    "function getTotalVotes() view returns (uint256)",
    "function getElectionStatus() view returns (bool)"
];

async function loadResults() {
    const resultsList = document.getElementById("resultsList");
    const totalVotes = document.getElementById("totalVotes");
    const electionStatus = document.getElementById("electionStatus");

    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);

        const contract = new ethers.Contract(
            contractAddress,
            contractABI,
            provider
        );

        const status = await contract.getElectionStatus();

        electionStatus.innerText = status
            ? "Election is OPEN"
            : "Election is CLOSED";

        const votes = await contract.getTotalVotes();

        totalVotes.innerText = "Total Votes: " + votes.toString();

        const count = await contract.getCandidateCount();

        resultsList.innerHTML = "";

        if (count.toNumber() === 0) {
            resultsList.innerText = "No candidates available.";
            return;
        }

        for (let i = 1; i <= count.toNumber(); i++) {
            const candidate = await contract.getCandidate(i);

            const div = document.createElement("div");
            div.className = "candidate";

            div.innerHTML = `
                <h3>${candidate.name}</h3>
                <p>Position: ${candidate.position}</p>
                <p>Votes: ${candidate.voteCount.toString()}</p>
            `;

            resultsList.appendChild(div);
        }

    } catch (error) {
        console.error("Error loading results:", error);

        electionStatus.innerText = "Unable to load election status.";
        totalVotes.innerText = "Unable to load total votes.";
        resultsList.innerText = "Unable to load election results.";
    }
}

document.getElementById("refreshButton")
    .addEventListener("click", loadResults);

loadResults();
