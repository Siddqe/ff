import mongoose from "mongoose";
import Counter from "./Counter.js";
 
const customerSchema = new mongoose.Schema({
  customerId: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  company: { type: String, default: "" },
  customerType: {
    type: String,
    enum: ["individual", "corporate"],
    default: "individual"
  },
  paymentTerms: {
    type: Number,
    // required: true,
    min: 1,
    max: 365,
    default: 30
  },
  joinDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "inactive"], default: "active" }
});
 
// Auto-increment customerId safely
customerSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { name: "customerId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
 
    this.customerId = "CUST" + String(counter.seq).padStart(5, "0");
  }
  next();
});

// Virtual for formatted payment terms display
customerSchema.virtual('paymentTermsDisplay').get(function() {
  // if (this.paymentTerms === 0) return 'Due on receipt';
  if (this.paymentTerms === 1) return 'Net 1 day';
  return `Net ${this.paymentTerms} days`;
});

// Ensure virtuals are included in JSON
customerSchema.set('toJSON', { virtuals: true });
 
export default mongoose.model("Customer", customerSchema);