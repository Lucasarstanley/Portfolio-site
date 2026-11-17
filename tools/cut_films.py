#!/usr/bin/env python3
"""Cut posters and 720p web copies from the masters in "Films for portfolio".

Usage: python3 tools/cut_films.py [--posters-only] [--only <id>]
Writes films/<id>.jpg (poster, 1280 wide or 720 wide for portrait) and films/<id>.mp4 (720p H.264 with AAC).
Films in BITRATE get a two-pass encode at that video bitrate instead of CRF 26, to keep the long ones under the 25MB file limit of Cloudflare Pages.
Film ids and source files are listed in FILMS below; copy lives in films.js.
"""
import subprocess, sys, pathlib, json

HERE = pathlib.Path(__file__).resolve().parent.parent
SRC = HERE.parent / "Films for portfolio"
OUT = HERE / "films"
FFMPEG = "/opt/miniconda3/lib/python3.13/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"

# id -> (source filename, poster time in seconds)
FILMS = {
    "moretti":      ("BIRRA_MORETTI_1080x1920_24p_32s_v1_9.mov", 8),
    "insure-and-go":("E1096_759358_Insure_and_Go_Hero_TVC_1920x1080_40s_V4_3_TEST_VO.mp4", 10),
    "apple-ep1":    ("E848_658097_Apple_Ecosystems_Ep1_3840x2160_H264_EN_v5_1.mov", 40),
    "apple-ep2":    ("E848_658097_Apple_Ecosystems_Ep2_3840x2160_H264_EN_v4_1.mov", 40),
    "apple-ep3":    ("E848_658097_Apple_Ecosystems_Ep3_3840x2160_H264_EN_v4_1.mov", 40),
    "apple-ep4":    ("E848_658097_Apple_Ecosystems_Ep4_3840x2160_H264_EN_v4_1.mov", 40),
    "lighthouse":   ("E877_672292_Google_Lighthouse_JALxFLC_v4_1.mov", 30),
    "expedia":      ("E877_683311_Expedia_Veo3_Edit_1920x1080_V1_4b.mp4", 20),
    "orbite":       ("E877_713269_Orbite_AI_Film_1920x1080_60s_EN_V5_6_VIEWING (1).mp4", 15),
    "spudos":       ("E877_719293_Viewpoint_2026_Spudos_MASTER_1920x1080_V3_3 (2).mp4", 8),
    "gren":         ("E930_700714_Gren_AI_Film_1920x1080_EN_90s_V5_1 (2).mp4", 30),
    "mr-tired":     ("Google_DSM_Stallion_AI_Sprint_MrTired_v5_1 (1) (3).mp4", 20),
    "iga":          ("IGA_Grade_v2.mov", 8),
    "moodlings":    ("Moodlings Final Video (1).mov", 9),
    "nectar":       ("NECTAR_v1_2 (2).mp4", 9),
    "piggies":      ("Piggies_v6_2_C (2).mov", 12),
    "revolutions":  ("Revolutions (1).mp4", 40),
    "small-hotel":  ("The very small hotel for very small people of exceptionally large talent.mov", 80),
    "desperados":   ("XXXXXX_Desperados_RTC_v1_10 (2).mp4", 20),
    "airbnb":       ("Airbnb_NewVersion_v2_1 2nd Jup - GRADE_v1.mov", 20),
    "andres-thai":  ("Andres_Thai_v2_1_ENG.mov", 15),
    "theres-less":  ("E896_710146_Stallion_Campaign_R2_But_Wait_Theres_Less_1920x1080_60s_EN_V2_4 (5).mp4", 20),
    "stallion-sprint": ("1Q26_Stallion_Campaign_Sprint_1920x1080_30s_VO_enUS_V35_R1.mp4", 10),
    "captain":      ("Captain Papodopolous.mp4", 30),  # poster supplied as "pan pano thumb.jpg", copied to films/captain.jpg by hand
}

# id -> video kbps for a two-pass encode (audio 112k). Set so the file lands near 23MB; everything else uses CRF 26.
BITRATE = {
    "small-hotel": 440,  # 5:32
    "captain": 380,      # 6:15
}

def run(args):
    r = subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args])
    if r.returncode != 0:
        print("  failed:", " ".join(args[:3]), file=sys.stderr)

def main():
    posters_only = "--posters-only" in sys.argv
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    OUT.mkdir(exist_ok=True)
    for fid, (name, t) in FILMS.items():
        if only and fid != only: continue
        src = SRC / name
        if not src.exists():
            print(f"missing: {name}"); continue
        poster = OUT / f"{fid}.jpg"
        if not poster.exists():
            print(f"poster  {fid}")
            run(["-ss", str(t), "-i", str(src), "-frames:v", "1",
                 "-vf", "scale='if(gt(iw,ih),1280,-2)':'if(gt(iw,ih),-2,1280)'", "-q:v", "3", str(poster)])
        if posters_only: continue
        web = OUT / f"{fid}.mp4"
        if not web.exists():
            print(f"encode  {fid}")
            scale = "scale='if(gt(iw,ih),1280,-2)':'if(gt(iw,ih),-2,1280)'"
            if fid in BITRATE:
                vb = BITRATE[fid]
                rate = ["-c:v", "libx264", "-preset", "medium", "-b:v", f"{vb}k", "-maxrate", f"{vb * 2}k", "-bufsize", f"{vb * 4}k", "-pix_fmt", "yuv420p"]
                log = str(OUT / f"{fid}-2pass")
                run(["-i", str(src), "-map", "0:v:0", "-an", "-vf", scale, *rate, "-pass", "1", "-passlogfile", log, "-f", "mp4", "/dev/null"])
                run(["-i", str(src), "-map", "0:v:0", "-map", "0:a:0?", "-vf", scale, *rate, "-pass", "2", "-passlogfile", log,
                     "-movflags", "+faststart", "-c:a", "aac", "-b:a", "112k", str(web)])
                for f in OUT.glob(f"{fid}-2pass*"): f.unlink()
            else:
                run(["-i", str(src), "-map", "0:v:0", "-map", "0:a:0?",
                     "-vf", scale,
                     "-c:v", "libx264", "-preset", "fast", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                     "-c:a", "aac", "-b:a", "128k", str(web)])
    sizes = {p.name: round(p.stat().st_size / 1e6, 1) for p in sorted(OUT.glob("*")) if p.suffix in (".mp4", ".jpg")}
    print(json.dumps(sizes, indent=1))

if __name__ == "__main__":
    main()
