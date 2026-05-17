// Wrapper to host the existing Radar page content inside the Chasseur tabs without re-implementing it.
// We import the full Radar page and render it without its AppLayout shell.
import { RadarInner } from "@/pages/Radar";

export const RadarContent = () => <RadarInner />;
