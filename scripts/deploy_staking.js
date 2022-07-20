async function main() {
   const NftStake = await ethers.getContractFactory("NftStake");

   const admin = "0x57f5Ab4B82726a153396430dd45f3d1667DC335B";
   const erc20_address = "0x193AcA30704F0615B6444f565b42d7FE34f5A012";

   // Start deployment, returning a promise that resolves to a contract object
   const contract = await NftStake.deploy(erc20_address, admin);   
   console.log("Contract deployed to address:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });