import mongoose from "mongoose";
 
const employeeSchema = new mongoose.Schema(
  {
   
    employeeId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
     panNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number']
    },
    designation: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      addressLine1: {
        type: String,
        required: true
      },
      addressLine2: {
        type: String,
        default: ''
      },
      country: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      pinCode: {
        type: String,
        required: true,
        // match: [/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit PIN code']
      }
    },
    photo: {
      type: String,
      default: null,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"], // Change to uppercase
      default: "Active" // Change to uppercase
     }
  },
 
  {
    timestamps: true,
  }
 
);
 
export default mongoose.model("Employee", employeeSchema);