/**
 * Shared Brutalist admin table cell/header padding (AdminDashboard, AdminUserProfile).
 * Parent tables should use `overflow-x-auto` so nowrap + min-width columns can scroll.
 */
export const adminTableTdBase = "p-3 border-r-2 border-foreground align-top";

/** Mobile: avoid collapsed route / listing / perf columns. */
export const adminTableTdMobileMin12 = "min-w-0 max-md:min-w-[12rem]";

/** Mobile: UID / wide id column. */
export const adminTableTdMobileMin13 = "min-w-0 max-md:min-w-[13rem]";
