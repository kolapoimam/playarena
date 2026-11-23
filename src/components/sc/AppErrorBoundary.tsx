import { Component, ReactNode } from "react";
import { ErrorScene } from "@/pages/NotFound";

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
      <ErrorScene
        code="Oops"
        title="Something went off side"
        body="This screen hit a problem. Reload to try again, or head home."
        primary={{ label: "Reload", onClick: () => window.location.reload() }}
        secondary={{ label: "Go home", onClick: () => (window.location.href = "/") }}
      />
    );
  }
}
