import {test} from "node:test";
import assert from "node:assert/strict";
import {paymentSplitValid,validPaymentAmount} from "../src/lib/purchase-payment-math";
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
