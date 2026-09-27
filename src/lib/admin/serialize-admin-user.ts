import type { CreditWallet, TelegramAccount, User } from "@prisma/client";

export type AdminUserListItem = {
  id: string;
  freeGenerationsUsed: number;
  freeGenerationsGranted: number;
  freeQuotaBlocked: boolean;
  telegramAccount: {
    username: string | null;
    firstName: string | null;
    telegramUserId: string;
  } | null;
  creditWallet: { balance: number; reserved: number } | null;
};

type Row = User & {
  telegramAccount: TelegramAccount | null;
  creditWallet: CreditWallet | null;
};

export function serializeAdminUserListItem(row: Row): AdminUserListItem {
  return {
    id: row.id,
    freeGenerationsUsed: row.freeGenerationsUsed,
    freeGenerationsGranted: row.freeGenerationsGranted,
    freeQuotaBlocked: row.freeQuotaBlocked,
    telegramAccount: row.telegramAccount
      ? {
          username: row.telegramAccount.username,
          firstName: row.telegramAccount.firstName,
          telegramUserId: row.telegramAccount.telegramUserId.toString(),
        }
      : null,
    creditWallet: row.creditWallet
      ? {
          balance: row.creditWallet.balance,
          reserved: row.creditWallet.reserved,
        }
      : null,
  };
}
