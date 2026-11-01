export function storedUserId(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sb-.+-auth-token$/.test(k)) {
        const v = JSON.parse(localStorage.getItem(k) || "null");
        const id = v?.user?.id;
        if (typeof id === "string") return id;
      }
    }
  } catch {
    /* sin almacenamiento */
  }
  return null;
}