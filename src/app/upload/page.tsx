import PasscodeGate from "@/components/PasscodeGate";
import UploadForm from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <main
      id="main"
      className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10"
    >
      <PasscodeGate>
        <UploadForm />
      </PasscodeGate>
    </main>
  );
}
