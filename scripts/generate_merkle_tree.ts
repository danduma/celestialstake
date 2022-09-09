const fs = require('fs');


const path=require("path");

import { generateMerkleTree, PieceInfo } from '../test/nftStake/test_helpers.js';


let rawdata = fs.readFileSync('attributes.json');
let attributes = JSON.parse(rawdata);

let keys =[...Object.keys(attributes) ];
console.log(keys);
let piece_map = {};

keys.forEach(element => {
  
  let piece = <PieceInfo>attributes[element];
  // console.log(piece);
  piece_map[element] = piece;
});

// console.log(piece_list);

let piece_list = [];

let placeholder_data = {
  "God": 0,
  "Type": 0,
  "Attributes": 0,
  "Set": 255
};

for (let counter = 0; counter < 4049; counter ++){
  if (counter in piece_map) {
    piece_list.push(<never>piece_map[counter]);
  } else {
    piece_list.push(<never>placeholder_data);
  }
}

let tree = generateMerkleTree(piece_list, null);
// console.log(tree);

tree.then( result => {
  let data = JSON.stringify(result);
  // console.log(data);
  fs.writeFileSync('merkle_proofs.json', data);
})

