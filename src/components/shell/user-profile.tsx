type ShellUser = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export function UserProfile({ user }: { user: ShellUser }) {
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2.5 rounded-md px-1 py-1.5">
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary">
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-sidebar-foreground">
          {user.name ?? "Account"}
        </p>
        <p className="truncate text-xs text-sidebar-foreground/60">{user.email}</p>
      </div>
    </div>
  );
}
