# Emblema POLÍCIA MILITAR — Impressão 3D

Emblema/placa com letras em relevo, reproduzindo o emblema do colete tático
(base preta com "POLÍCIA MILITAR" em amarelo).

## Arquivos

| Arquivo | Descrição |
|---|---|
| `emblema-policia-militar.3mf` | Modelo pronto para o fatiador (2 objetos coloridos) |
| `gerar_emblema.py` | Script que gera o .3MF (parâmetros ajustáveis) |
| `preview-emblema.png` | Prévia visual do modelo |

## Dimensões

- Placa: **160 × 78 × 4 mm**, cantos arredondados
- Letras em relevo: **+1,6 mm** (altura total 5,6 mm)
- As letras penetram 0,6 mm na base para garantir aderência entre as partes

## Como imprimir

1. Abra o `.3mf` no fatiador (Bambu Studio, OrcaSlicer, PrusaSlicer, Cura…).
   O arquivo já vem com dois objetos separados e coloridos:
   - **Base (preto)** — filamento preto
   - **Letras (amarelo)** — filamento amarelo
2. **Impressora multicor (AMS/MMU):** atribua preto à base e amarelo às letras.
3. **Impressora de 1 cor:** imprima tudo em preto e use *troca de filamento*
   (pausa/M600) na camada onde as letras começam (z = 4,0 mm), trocando para
   amarelo. Nos fatiadores: "Adicionar pausa/troca de filamento" nessa camada.
4. Sugestões: camada 0,2 mm, 3 perímetros, 15–20% de preenchimento, sem suporte.

## Regenerar / ajustar tamanho

```bash
pip install trimesh shapely mapbox_earcut matplotlib numpy scipy
python3 gerar_emblema.py saida.3mf
```

Parâmetros (largura, altura, relevo, cores, texto) estão no topo do script.
