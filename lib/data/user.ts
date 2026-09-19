import type { User } from "@/lib/types";

// Mock session user until auth exists (name and city from the Figma drawer).
const currentUser: User = {
  id: "user-1",
  firstName: "Ryzen",
  city: "Bangalore",
};

export async function getCurrentUser(): Promise<User> {
  return currentUser;
}
