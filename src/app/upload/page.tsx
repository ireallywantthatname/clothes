import UploadForm from "@/components/UploadForm";
import PasscodeGate from "@/components/PasscodeGate";
import { isPasscodeUnlocked } from "@/lib/passcode";

export default async function UploadPage() {
  const unlocked = await isPasscodeUnlocked();

  if (!unlocked) {
    return (
      <main
        id="main"
        className="flex-1 flex flex-col items-center px-4 pb-10 pt-1"
      >
        <PasscodeGate locked>{null}</PasscodeGate>
      </main>
    );
  }

  return (
    <main
      id="main"
      className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10"
    >
      <PasscodeGate locked={false}>
        <UploadForm />
      </PasscodeGate>
    </main>
  );
}
