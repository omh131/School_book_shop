export async function appFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export type AppUser = {
  id: number;
  clerkId: string;
  email: string;
  name: string;
  imageUrl: string | null;
  role: "student" | "moderator" | "owner";
  blocked: boolean;
  createdAt: string;
};

export type CartItem = {
  book: {
    id: number;
    title: string;
    arabicTitle: string | null;
    author: string;
    sellingPrice: number;
    imageUrl: string | null;
    coverTone: string;
  };
  quantity: number;
};