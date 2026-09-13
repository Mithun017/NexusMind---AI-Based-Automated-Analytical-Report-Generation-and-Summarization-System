import io
from typing import List, Dict, Any
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt


class ChartRenderer:
    @staticmethod
    def render_chromatogram(peaks: List[Dict[str, Any]], anomalies: List[Dict[str, Any]]) -> bytes:
        """Renders chromatogram with peaks and anomaly highlights to PNG bytes."""
        fig, ax = plt.subplots(figsize=(8, 3.5), dpi=200)

        anomaly_pids = {a.get("peak_id") for a in anomalies if a.get("is_anomaly")}

        if not peaks:
            ax.text(0.5, 0.5, "No peak data available", ha="center", va="center")
        else:
            # For PDF clarity and high speed, plot up to top 60 peaks by area + all anomalies
            display_peaks = sorted(peaks, key=lambda p: float(p.get("peak_area", 0.0)), reverse=True)[:60]
            display_peaks = sorted(display_peaks, key=lambda p: float(p.get("retention_time", 0.0)))
            
            rts = [float(p.get("retention_time", 0.0)) for p in display_peaks]
            intensities = [float(p.get("intensity", 0.0)) for p in display_peaks]

            # Plot stem/baseline
            ax.stem(rts, intensities, linefmt="C0-", markerfmt="C0o", basefmt="k-")

            # Annotate peaks (top 15 prominent for legibility)
            top_annotated_pids = {p.get("peak_id") for p in sorted(display_peaks, key=lambda p: float(p.get("intensity", 0.0)), reverse=True)[:15]}
            for p in display_peaks:
                pid = p.get("peak_id")
                rt = float(p.get("retention_time", 0.0))
                intensity = float(p.get("intensity", 0.0))
                comp = str(p.get("compound_name", ""))
                is_anom = pid in anomaly_pids

                if is_anom or pid in top_annotated_pids:
                    color = "#e53e3e" if is_anom else "#2b6cb0"
                    label = f"{pid}\n({comp[:10]})" if len(comp) <= 10 else pid
                    if is_anom:
                        label += "\n[ANOM]"

                    ax.annotate(
                        label,
                        (rt, intensity),
                        textcoords="offset points",
                        xytext=(0, 6),
                        ha="center",
                        fontsize=6.5,
                        fontweight="bold" if is_anom else "normal",
                        color=color,
                    )

        ax.set_title("Chromatogram & Peak Profile (USP Analytical Map)", fontsize=10, fontweight="bold", pad=8)
        ax.set_xlabel("Retention Time (min)", fontsize=9)
        ax.set_ylabel("Intensity (mAU)", fontsize=9)
        ax.grid(True, linestyle="--", alpha=0.5)
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return buf.read()

    @staticmethod
    def render_anomaly_distribution(anomalies: List[Dict[str, Any]]) -> bytes:
        """Renders anomaly score bar chart to PNG bytes."""
        fig, ax = plt.subplots(figsize=(8, 2.8), dpi=200)

        if not anomalies:
            ax.text(0.5, 0.5, "No anomaly data", ha="center", va="center")
        else:
            # Render top 25 anomaly scores for PDF legibility
            sorted_anoms = sorted(anomalies, key=lambda a: float(a.get("anomaly_score", 0.0)), reverse=True)[:25]
            pids = [a.get("peak_id", "") for a in sorted_anoms]
            scores = [float(a.get("anomaly_score", 0.0)) for a in sorted_anoms]
            colors = [
                "#e53e3e" if a.get("classification") == "Confirmed Anomaly"
                else "#dd6b20" if a.get("classification") == "Potential Anomaly"
                else "#38a169"
                for a in sorted_anoms
            ]

            ax.bar(pids, scores, color=colors, width=0.5, edgecolor="black", linewidth=0.5)
            ax.axhline(0.8, color="#e53e3e", linestyle="--", alpha=0.7, label="Confirmed (0.8)")
            ax.axhline(0.5, color="#dd6b20", linestyle=":", alpha=0.7, label="Potential (0.5)")
            ax.legend(fontsize=7, loc="upper right")
            plt.xticks(rotation=45, ha="right", fontsize=7)

        ax.set_title("ML Anomaly Score Distribution", fontsize=10, fontweight="bold", pad=8)
        ax.set_xlabel("Peak ID", fontsize=8)
        ax.set_ylabel("Anomaly Score (0-1)", fontsize=8)
        ax.set_ylim(0, 1.05)
        ax.grid(True, linestyle="--", alpha=0.4, axis="y")
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return buf.read()
