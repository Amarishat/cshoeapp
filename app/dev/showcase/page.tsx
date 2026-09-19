import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PhoneShowcase } from "./PhoneShowcase";

export const metadata: Metadata = { title: "Showcase" };

// Development-only presentation of the app in a phone frame; 404 in production.
export default function DevShowcasePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PhoneShowcase />;
}
