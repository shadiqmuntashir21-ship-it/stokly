import {test} from "node:test";
import assert from "node:assert/strict";
import {paymentSplitValid,validPaymentAmount,purchaseFundingError} from "../src/lib/purchase-payment-math";
test("payment status matches cash split",()=>{
 assert.equal(paymentSplitValid("paid",2250000,2250000,0),true);
 assert.equal(paymentSplitValid("paid",2250000,500000,1750000),true);
 assert.equal(paymentSplitValid("partial",2250000,500000,0),true);
 assert.equal(paymentSplitValid("unpaid",2250000,0,0),true);
 assert.equal(paymentSplitValid("paid",2250000,500000,0),false);
 assert.equal(paymentSplitValid("partial",2250000,2250000,0),false);
 assert.equal(paymentSplitValid("unpaid",2250000,100,0),false);
 assert.equal(paymentSplitValid("paid",2250000,2500000,-250000),false);
 assert.equal(validPaymentAmount(1.234),false);
 assert.equal(paymentSplitValid("paid",0.3,0.1,0.2),true);
});

test("Unconfigured cash does not block unpaid purchases but blocks actual payments",()=>{
 const missing={SMALL:null,LARGE:null};
 assert.equal(purchaseFundingError(missing,0,0),"");
 assert.ok(purchaseFundingError(missing,0,1000).includes("Kas Besar"));
 assert.ok(purchaseFundingError(missing,1000,0).includes("Kas Kecil"));
 assert.equal(purchaseFundingError({SMALL:1000,LARGE:null},1000,0),"");
 assert.ok(purchaseFundingError({SMALL:1000,LARGE:500},1000,501).includes("tidak mencukupi"));
 assert.equal(purchaseFundingError({SMALL:1000,LARGE:500},1000,500),"");
 assert.ok(purchaseFundingError({SMALL:0,LARGE:0},1,0));
 assert.equal(purchaseFundingError({SMALL:-100,LARGE:null},0,0),"");
});
