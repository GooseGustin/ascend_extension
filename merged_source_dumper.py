import os

def collect_source_files(root_dir="./src", output_file="merged_source_dump.txt"):
    """
    Walk through the src directory, read all relevant project files,
    and append their full contents into one large output document.

    The output is formatted with clear section markers:
    ===== FILE: path/to/file.ts =====
    <file contents>
    """

    exts = {
        ".ts", ".tsx", ".js", ".jsx",
        ".css", ".md", ".json"
    }

    collected_paths = []

    # Walk the directory tree
    for folder, _, files in os.walk(root_dir):
        for file in files:
            if any(file.endswith(ext) for ext in exts):
                full_path = os.path.join(folder, file)
                collected_paths.append(full_path)

    # Sort paths alphabetically for stable ordering
    collected_paths.sort()

    with open(output_file, "w", encoding="utf-8") as out:
        for path in collected_paths:
            out.write(f"\n\n===== FILE: {path} =====\n\n")

            try:
                with open(path, "r", encoding="utf-8") as f:
                    out.write(f.read())
            except Exception as e:
                out.write(f"[ERROR READING FILE: {e}]")

    return output_file


# Example usage:
final_doc = collect_source_files()
print("Merged document saved as:", final_doc)
