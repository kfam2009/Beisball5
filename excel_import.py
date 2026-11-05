import json
import sys
from pathlib import Path

from openpyxl import load_workbook


WORKBOOK = Path(r"C:\Users\claud\Videos\Baseball5\Datos.xlsx")


def clean(value):
    if value is None:
        return ""
    return str(value).strip()


def read_sheet(workbook, name):
    if name not in workbook.sheetnames:
        return []
    sheet = workbook[name]
    rows = []
    for number, player_name, role in sheet.iter_rows(values_only=True):
        number = clean(number)
        player_name = clean(player_name)
        role = clean(role)
        if not any([number, player_name, role]):
            continue
        rows.append({"number": number, "name": player_name, "role": role})
    return rows


def roster_text(rows):
    return "\n".join(f"{row['number']}  {row['name']}  {row['role']}".strip() for row in rows)


def main():
    workbook_path = Path(sys.argv[1]) if len(sys.argv) > 1 else WORKBOOK
    workbook = load_workbook(workbook_path, data_only=True)
    home = read_sheet(workbook, "HOME")
    away = read_sheet(workbook, "AWAY")
    umpires = read_sheet(workbook, "UMPIRES")
    data = {
        "source": str(workbook_path),
        "home": home,
        "away": away,
        "umpires": umpires,
        "homeText": roster_text(home),
        "awayText": roster_text(away),
        "umpiresText": roster_text(umpires),
    }
    print(json.dumps(data, ensure_ascii=False))


if __name__ == "__main__":
    main()
