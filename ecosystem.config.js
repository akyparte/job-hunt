module.exports = {
  apps: [
    {
      name: "hr-mailer-1",
      script: "./mailer.js",

      env: {
        GMAIL_USER: "akshayparte580@gmail.com",
        GMAIL_APP_PASSWORD: "ltjs kcii nhil zfec",
        DAILY_LIMIT: "300",
        WAIT_SECONDS: "30",
        RESUME_PATH: "./akshay_parte.pdf",
        PROGRESS_FILE: "./progress1.json",
        CONTACTS_FILE: "./contacts1.json",
      }
    },

    {
      name: "hr-mailer-2",
      script: "./mailer.js",

      env: {
        GMAIL_USER: "akshayparte60@gmail.com",
        GMAIL_APP_PASSWORD: "jkqi vojz xdlg kzef",
        DAILY_LIMIT: "300",
        WAIT_SECONDS: "30",
        RESUME_PATH: "./akshay_parte.pdf",
        PROGRESS_FILE: "./progress2.json",
        CONTACTS_FILE: "./contacts2.json",
      }
    },

    {
      name: "hr-mailer-3",
      script: "./mailer.js",

      env: {
        GMAIL_USER: "akshayparte0728@gmail.com",
        GMAIL_APP_PASSWORD: "cxbr bait myry nnyy",
        DAILY_LIMIT: "300",
        WAIT_SECONDS: "30",
        RESUME_PATH: "./akshay_parte.pdf",
        PROGRESS_FILE: "./progress3.json",
        CONTACTS_FILE: "./contacts3.json",
      }
    },

    {
      name: "hr-mailer-4",
      script: "./mailer.js",

      env: {
        GMAIL_USER: "parteakshay511@gmail.com",
        GMAIL_APP_PASSWORD: "thuu punr arci kikl",
        DAILY_LIMIT: "300",
        WAIT_SECONDS: "30",
        RESUME_PATH: "./akshay_parte.pdf",
        PROGRESS_FILE: "./progress4.json",
        CONTACTS_FILE: "./contacts4.json",
      }
    }
  ]
};