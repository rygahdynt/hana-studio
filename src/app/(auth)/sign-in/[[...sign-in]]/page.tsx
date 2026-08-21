import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-neutral-900 border border-neutral-800 shadow-2xl",
          },
        }}
      />
    </div>
  );
}
