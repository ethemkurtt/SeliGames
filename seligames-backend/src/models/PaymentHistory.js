const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'TRY',
        uppercase: true
    },
    plan: {
        type: String,
        enum: ['free', 'basic', 'pro', 'ultra'],
        required: true
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'pending', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        trim: true
        // 'credit_card', 'paypal', 'bank_transfer', vb.
    },
    transactionId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index'ler — transactionId zaten `unique: true` ile index'leniyor.
paymentHistorySchema.index({ userId: 1, paymentDate: -1 });
paymentHistorySchema.index({ status: 1 });

const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);

module.exports = PaymentHistory;
