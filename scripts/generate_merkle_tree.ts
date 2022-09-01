const fs = require('fs');


const path=require("path");

import { generateMerkleTree, PieceInfo } from '../test/nftStake/test_helpers.js';


let rawdata = fs.readFileSync('attributes.json');
let attributes = JSON.parse(rawdata);

let keys =[...Object.keys(attributes) ];
console.log(keys);
let piece_list = [];

keys.forEach(element => {
  
  let piece = <PieceInfo>attributes[element];
  // console.log(piece);
  piece_list.push(<never>piece);
});

// console.log(piece_list);

let tree = generateMerkleTree(piece_list, null);
// console.log(tree);

tree.then( result => {
  let data = JSON.stringify(result);
  // console.log(data);
  fs.writeFileSync('merkle_proofs.json', data);
})

