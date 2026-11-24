import { Component, ReactNode } from "react";
import { FunState } from "@/components/sc/FunState";
import { Home, RefreshCw } from "lucide-react";

/** Catches a crash anywhere in a screen and shows a friendly way back instead of a blank page. */
export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("Screen crashed", error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <FunState
        kind="error"
        badge="Offside"
        title="This screen went offside"
        body="Something on this page tripped up. Reload to give it another go, or head back home."
        primary={{ label: "Reload", onClick: () => window.location.reload(), icon: RefreshCw }}
        secondary={{ label: "Go home", onClick: () => (window.location.href = "/"), icon: Home }}
      />
    );
  }
}
