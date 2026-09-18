"""Pretendard를 OG 이미지용으로 서브셋한다 (ssccops#361).

`next/og`(Satori)는 시스템 폰트를 쓰지 않고 폰트 바이트를 직접 받는다. 한글 전체(11,172자)는
1.5MB라 그대로 실을 수 없어 **KS X 1001 완성형 2,350자** + ASCII + 자주 쓰는 문장부호로 줄인다
(≈300KB). 폼 제목·안내에 그 밖의 글자(옛한글·희귀 한자)가 오면 □로 그려진다 — 카드 한 장의
대가로 받아들인다.

사용:
  pip install fonttools
  python scripts/fonts/subset-pretendard.py <Pretendard-SemiBold.otf> apps/www/public/fonts/pretendard-semibold-ko.otf

원본은 https://github.com/orioncactus/pretendard (SIL OFL 1.1). 서브셋도 같은 라이선스이며
파일명에 Reserved Font Name «Pretendard»를 그대로 쓰는 것은 OFL이 서브셋을 «수정본»으로 보아
이름을 바꾸라고 하므로 산출물 내부 이름은 `Pretendard KO Subset`으로 바꾼다.
"""
import sys

from fontTools import subset
from fontTools.ttLib import TTFont


def ksx1001_hangul() -> set[int]:
    """EUC-KR 2바이트 영역(0xB0A1~0xC8FE)을 풀면 완성형 한글 2,350자가 나온다."""
    out = set()
    for lead in range(0xB0, 0xC9):
        for trail in range(0xA1, 0xFF):
            try:
                ch = bytes([lead, trail]).decode("euc-kr")
            except UnicodeDecodeError:
                continue
            out.add(ord(ch))
    return out


def main(src: str, dst: str) -> None:
    codepoints = set(range(0x20, 0x7F))  # ASCII
    codepoints |= {0xA0, 0xA9, 0xB7, 0xD7}  # nbsp · © · 가운뎃점 · ×
    codepoints |= set(range(0x2010, 0x2027))  # – — ‘ ’ “ ” … ‧
    codepoints |= {0x00AB, 0x00BB, 0x2030, 0x203B, 0x2190, 0x2192, 0x2022}  # « » ‰ ※ ← → •
    codepoints |= set(range(0x3000, 0x3004)) | {0x300C, 0x300D, 0x300E, 0x300F, 0x3131, 0x314F}  # 　、。「」『』 ㄱ ㅏ
    codepoints |= set(range(0xFF01, 0xFF5F))  # 전각 문장부호
    codepoints |= ksx1001_hangul()

    options = subset.Options()
    options.layout_features = ["kern", "liga"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    options.desubroutinize = True

    font = TTFont(src)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=sorted(codepoints))
    subsetter.subset(font)

    # OFL: 수정본은 Reserved Font Name을 그대로 쓰지 않는다
    for rec in font["name"].names:
        if rec.nameID in (1, 3, 4, 6, 16):
            text = rec.toUnicode()
            rec.string = text.replace("Pretendard", "PretendardKOSubset").replace(" KO Subset", "KOSubset")

    font.save(dst)
    print(f"{dst}: {len(codepoints)} codepoints")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
