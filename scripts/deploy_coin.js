async function main() {
   const RELICS = await ethers.getContractFactory("RELICS");

   const admin = "0x57f5Ab4B82726a153396430dd45f3d1667DC335B";

   // Start deployment, returning a promise that resolves to a contract object
   const contract = await RELICS.deploy(100000000);
   console.log("Contract deployed to address:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });