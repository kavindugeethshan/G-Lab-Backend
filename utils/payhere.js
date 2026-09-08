import crypto from "crypto";

export const generatePayHereHash = (
    merchantId,
    orderId,
    amount,
    currency,
    merchantSecret
) => {
    const formattedAmount = Number(amount).toFixed(2);

    const secretHash = crypto
        .createHash("md5")
        .update(merchantSecret)
        .digest("hex")
        .toUpperCase();

    const hashString =
        merchantId +
        orderId +
        formattedAmount +
        currency +
        secretHash;

    return crypto
        .createHash("md5")
        .update(hashString)
        .digest("hex")
        .toUpperCase();
};

export const verifyPayHereNotifyHash = (
    merchantId,
    orderId,
    payhereAmount,
    payhereCurrency,
    statusCode,
    merchantSecret,
    md5sig
) => {
    const formattedAmount = Number(payhereAmount).toFixed(2);

    const secretHash = crypto
        .createHash("md5")
        .update((merchantSecret || "").trim())
        .digest("hex")
        .toUpperCase();

    const hashString =
        (merchantId || "").toString().trim() +
        (orderId || "").toString().trim() +
        formattedAmount +
        (payhereCurrency || "").toString().trim() +
        (statusCode || "").toString().trim() +
        secretHash;

    const localMd5sig = crypto
        .createHash("md5")
        .update(hashString)
        .digest("hex")
        .toUpperCase();

    const receivedMd5 = (md5sig || "").toString().trim().toUpperCase();

    const localBuffer = Buffer.from(localMd5sig, "utf-8");
    const receivedBuffer = Buffer.from(receivedMd5, "utf-8");

    if (localBuffer.length !== receivedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(localBuffer, receivedBuffer);
};
