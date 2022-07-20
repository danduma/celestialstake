"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var fs = require('fs');
var path = require("path");
var test_helpers_js_1 = require("../test/nftStake/test_helpers.js");
var rawdata = fs.readFileSync('attributes.json');
var attributes = JSON.parse(rawdata);
var keys = __spreadArray([], Object.keys(attributes), true);
var piece_list = [];
keys.forEach(function (element) {
    var piece = attributes[element];
    // console.log(piece);
    piece_list.push(piece);
});
// console.log(piece_list);
var tree = (0, test_helpers_js_1.generateMerkleTree)(piece_list, null);
// console.log(tree);
tree.then(function (result) {
    var data = JSON.stringify(result);
    console.log(data);
    fs.writeFileSync('merkle_proofs.json', data);
});
