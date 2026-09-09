const fs = require("fs");

class AccountManager {
  constructor(accounts, progress, saveProgress) {
    this.accounts = accounts;
    this.progress = progress;
    this.saveProgress = saveProgress;

    this.progress.nextAccountIndex ??= 0;
    this.progress.accountStats ??= {};
  }

  getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  getStats(account) {
    const today = this.getToday();

    if (!this.progress.accountStats[account.email]) {
      this.progress.accountStats[account.email] = {
        date: today,
        sentToday: 0
      };

      this.saveProgress();
    }

    const stats =
      this.progress.accountStats[account.email];

    // New day → reset daily counter
    if (stats.date !== today) {
      stats.date = today;
      stats.sentToday = 0;

      this.saveProgress();
    }

    return stats;
  }

  getLimit(account) {
    return Number(
      account.dailyLimit || 300
    );
  }

  canSend(account) {
    const stats = this.getStats(account);
    const limit = this.getLimit(account);

    return stats.sentToday < limit;
  }

  giveNextAccount() {
    if (!this.accounts.length) {
      return null;
    }

    const total = this.accounts.length;

    for (let i = 0; i < total; i++) {
      const index =
        (this.progress.nextAccountIndex + i) %
        total;

      const account = this.accounts[index];

      if (this.canSend(account)) {
        this.progress.nextAccountIndex =
          (index + 1) % total;

        this.saveProgress();

        return account;
      }
    }

    return null;
  }

  incrementSent(account) {
    const stats = this.getStats(account);

    stats.sentToday++;

    this.saveProgress();
  }

  getStatus(account) {
    const stats = this.getStats(account);

    const limit = this.getLimit(account);

    return {
      email: account.email,
      date: stats.date,
      sentToday: stats.sentToday,
      dailyLimit: limit,
      remaining: Math.max(
        limit - stats.sentToday,
        0
      )
    };
  }

  getAllStatus() {
    return this.accounts.map(account =>
      this.getStatus(account)
    );
  }
}

module.exports = AccountManager;