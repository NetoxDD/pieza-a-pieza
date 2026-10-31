export type PublicProfile = {
  id: string;
  name: string;
  title: string;
  organization: string;
  bio: string;
  avatarKind: "preset" | "photo";
  avatarPreset: string;
  avatarUrl?: string;
  phone?: string;
  role?: string;
};