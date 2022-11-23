module.exports = {
    mode: "dev", // dev or prod
    port: 10000,
    log: {
        level: "debug",
        dir: "./log",
        name: "game",
    },

    swagger: {
        host: "http://localhost:10000",
    },

    aws:{
        accessKeyId: "AKIA27XQWENEJDUG3HYU",
        secretKey:"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",
        region: "ap-northeast-2",
    },

    publicKey: "3pqBhoYTpGAxqwgEkejiZKFkLGaAr3Fug1sRtiGdz9KP",//"Hgv3DScVV1xuLr8wTVGBgcq6kL1JcbdLdG51awppZqAn", //
    secretKey: "3q9kpYefgo1bbF9DwzTtj2TXY5jz3g4qieveypHinKfPYpPe3YmtMn4RZphDXPfwZqEUDMZdMWCmHfTsPXjC3xEd"//"jfzt7ZGssYR6FRvxD6ZscQgyU9j2w2EwoSuJnPz2Dus3tK7CMhSJEks87A6PXrzKMEu4PPTu8GcsJCrACNuAjQa"//
}