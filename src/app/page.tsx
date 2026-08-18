import HomeContent from "@/components/HomeContent";
import PasscodeGate from "@/components/PasscodeGate";

export default function HomePage() {
  return (
    <main
      id="main"
      className="flex-1 flex flex-col items-center px-4 pb-10 pt-1"
    >
      <PasscodeGate>
        <HomeContent />
      </PasscodeGate>
    </main>
  );
}
