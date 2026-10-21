"use client"

import { useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { cheapestSize, netPrice, presentationCost, presentationHealth, presentationMargin, taxIn } from "@/lib/kitchen/rules"
import { fmtN, money, taxName } from "@/lib/kitchen/format"
import type { Presentation, SaleKind } from "@/lib/kitchen/types"
import { Eyebrow, Field, HelpTip, LinesEditor, Seg, toNumber, useModal } from "../shared"
import type { QtyRow } from "./supply-rows"
import { blankQty, SupplySelect, qtyRows } from "./supply-rows"
import { blankSize, SizeRows, sizeRows, type SizeRow } from "./presentation-sizes"
import { HELP } from "@/lib/kitchen/help"
import { MoneyInput } from "@/components/ui/money-input"

// ── Lo que se vende: caja armada, por unidad o sabor y tamaño ──
// El precio ya incluye el empaque. La dueña elige en qué va cada cosa.

type ItemRow = { productId: string; units: string; surcharge: string }
const blankItem = (): ItemRow => ({ productId: "", units: "", surcharge: "" })

const KINDS: [SaleKind, string][] = [["BOX", "Caja armada"], ["UNIT", "Por unidad"], ["SIZES", "Sabor y tamaño"]]
const KIND_HELP: Record<SaleKind, string> = {
  BOX: "Lleva siempre lo mismo. Ej.: caja de 9 con 3 de chips, 3 de macadamia y 3 red velvet.",
  UNIT: "Precio por unidad: la clienta elige cuántas y de qué sabores. Ej.: galleta rellena a $ 10.500 c/u.",
  SIZES: "La clienta elige sabor y tamaño. Ej.: cheesecake pequeño, mediano o grande.",
}

export function PresentationForm({ presentation }: { presentation?: Presentation }) {
  const { data, rules, mutate } = useKitchen()
  const { close } = useModal()
  const [kind, setKind] = useState<SaleKind>(presentation?.kind ?? "BOX")
  const [name, setName] = useState(presentation?.name ?? "")
  const [price, setPrice] = useState(presentation ? String(presentation.price) : "")
  const [active, setActive] = useState(presentation?.active ?? true)
  const [items, setItems] = useState<ItemRow[]>(
    presentation?.items.map((i) => ({ productId: i.productId, units: String(i.units), surcharge: i.surcharge ? String(i.surcharge) : "" })) ?? [blankItem()],
  )
  const [pack, setPack] = useState<QtyRow[]>(presentation?.pack.length ? presentation.pack.map((p) => ({ supplyId: p.supplyId, qty: String(p.qty) })) : [blankQty()])
  const [sizes, setSizes] = useState<SizeRow[]>(
    presentation?.sizes.length
      ? presentation.sizes.map((s) => ({ id: s.id, name: s.name, portions: s.portions, mold: s.mold, price: String(s.price), grams: s.grams ? String(s.grams) : "", packSupplyId: s.packSupplyId ?? "" }))
      : [blankSize()],
  )

  const box = kind === "BOX"
  const chosen = items.filter((i) => i.productId)
  const tmpSizes = sizeRows(sizes)
  const tmp = {
    kind,
    price: kind === "SIZES" ? (cheapestSize(tmpSizes)?.price ?? 0) : toNumber(price) || 0,
    items: chosen.map((i) => ({ productId: i.productId, units: box ? toNumber(i.units) || 0 : 1, surcharge: toNumber(i.surcharge) || 0 })).filter((i) => i.units > 0),
    pack: kind === "SIZES" ? [] : qtyRows(pack).filter((p) => p.qty > 0),
    sizes: tmpSizes.map((s, i) => ({ ...s, id: s.id ?? `nuevo-${i}` })),
  }
  const cost = presentationCost(tmp, rules)
  const health = presentationHealth(tmp, rules, data.settings.targetMargin)
  const tone = health.kind === "ok" ? "c-sky" : health.kind === "warn" ? "c-peach" : "c-strawberry"
  const costLabel = kind === "UNIT" ? "Una unidad (el sabor más caro) con su empaque cuesta" : kind === "SIZES" ? "El tamaño más barato cuesta" : "Cuesta hacerla"

  return (
    <Modal
      title={presentation ? `Editar ${presentation.name}` : "Nuevo: lo que vendes"}
      sub="Lo que pide la clienta. El precio ya incluye el empaque."
      wide
      onClose={close}
      onSubmit={async () => {
        if (!name.trim()) throw new FormError("Escribe el nombre.")
        if (kind !== "SIZES" && !(toNumber(price) > 0)) throw new FormError("Escribe el precio: no puede quedar en 0.")
        if (pack.some((p) => p.supplyId && !(toNumber(p.qty) > 0))) throw new FormError("Escribe cuántos lleva de cada empaque.")
        if (!chosen.length) throw new FormError(box ? "Agrega qué productos lleva." : "Elige al menos un sabor.")
        if (box && chosen.some((i) => !(toNumber(i.units) >= 1))) throw new FormError("Escribe cuántas unidades lleva de cada producto.")
        if (!box && new Set(chosen.map((i) => i.productId)).size !== chosen.length) throw new FormError("Hay un sabor repetido.")
        if (kind === "SIZES" && (!tmpSizes.length || tmpSizes.some((s) => !s.name || !(s.price > 0)))) {
          throw new FormError("Cada tamaño necesita nombre y precio.")
        }
        const body = {
          name: name.trim(),
          kind,
          price: kind === "SIZES" ? undefined : Math.round(toNumber(price)),
          active,
          items: chosen.map((i) => ({ productId: i.productId, units: box ? Math.round(toNumber(i.units)) : 1, surcharge: Math.round(toNumber(i.surcharge) || 0) })),
          pack: tmp.pack,
          sizes: tmpSizes.map((s) => ({ ...s, price: Math.round(s.price) })),
        }
        if (presentation) await mutate(`/presentations/${presentation.id}`, "PUT", body, "Guardado")
        else await mutate("/presentations", "POST", body, "Agregado a lo que vendes")
        close()
      }}
    >
      <div>
        <Eyebrow help={HELP.saleKind}>¿Cómo lo vendes?</Eyebrow>
        <Seg name="kind" value={kind} onChange={setKind} options={KINDS} />
        <div className="small muted" style={{ marginTop: 6 }}>{KIND_HELP[kind]}</div>
      </div>
      <div className="fields">
        <Field label="Nombre" help={HELP.saleName}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "BOX" ? "Ej. Caja de 9 unidades" : kind === "UNIT" ? "Ej. Galleta rellena" : "Ej. Cheesecake vasco"} required />
        </Field>
        {kind === "SIZES" ? null : (
          <Field label={kind === "UNIT" ? "Precio por unidad ($)" : "Precio de venta ($)"} help={HELP.salePrice}>
            <MoneyInput value={price} onChange={(v) => setPrice(v)} required />
          </Field>
        )}
      </div>

      <div className="eyebrow">{box ? "Qué lleva" : kind === "UNIT" ? "Sabores que puede elegir" : "Sabores (con recargo si cuestan más)"}<HelpTip text={HELP.saleItems} /></div>
      <LinesEditor
        rows={items}
        setRows={setItems}
        blank={blankItem}
        addLabel={box ? "Agregar producto" : "Agregar sabor"}
        className={kind === "UNIT" ? "k-flavor" : "k-items"}
        render={(r, update) => (
          <>
            <select aria-label="Producto" value={r.productId} onChange={(e) => update({ productId: e.target.value })}>
              <option value="">{box ? "Elige un producto" : "Elige un sabor"}</option>
              {data.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {box ? <input aria-label="Unidades" type="number" min="1" step="1" placeholder="Unidades" value={r.units} onChange={(e) => update({ units: e.target.value })} /> : null}
            {kind === "SIZES" ? <MoneyInput aria-label="Recargo" placeholder="Recargo 0,00" value={r.surcharge} onChange={(v) => update({ surcharge: v })} /> : null}
          </>
        )}
      />

      {kind === "SIZES" ? (
        <SizeRows rows={sizes} setRows={setSizes} />
      ) : (
        <>
          <div className="eyebrow">{box ? "Empaque (por cada caja)" : "Empaque de siempre (uno por pedido)"}<HelpTip text={HELP.salePack} /></div>
          <LinesEditor
            rows={pack}
            setRows={setPack}
            blank={blankQty}
            addLabel="Agregar empaque"
            className="k-pack"
            render={(r, update) => (
              <>
                <SupplySelect value={r.supplyId} onChange={(supplyId) => update({ supplyId })} />
                <input aria-label="Cantidad" type="number" min="0" step="any" placeholder="Cantidad" value={r.qty} onChange={(e) => update({ qty: e.target.value })} />
              </>
            )}
          />
        </>
      )}

      <label className="row small" style={{ gap: 8 }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--accent-deep)" }} />
        Disponible para la venta
      </label>
      {tmp.items.length && tmp.price ? (
        <div className={`callout ${tone}`}>
          <div className="row between">
            <span>
              {costLabel} <b className="num">{money(cost)}</b>
            </span>
            <span className={`chip ${health.kind}`}>{health.label} · {fmtN(presentationMargin(tmp, rules) * 100)} %</span>
          </div>
          {rules.taxRate ? (
            <div className="small" style={{ marginTop: 6 }}>
              De {money(tmp.price)}, {money(taxIn(tmp.price, rules.taxRate))} son {taxName(rules.taxRate)}: te quedan <b>{money(netPrice(tmp.price, rules.taxRate))}</b>.
            </div>
          ) : null}
          {health.suggested ? (
            <div className="small" style={{ marginTop: 6 }}>
              Precio sugerido: <b>{money(health.suggested)}</b>
            </div>
          ) : null}
          {box ? <div className="small" style={{ marginTop: 6 }}>Lleva {tmp.items.reduce((s, i) => s + i.units, 0)} unidades: {tmp.items.map((i) => `${i.units} ${byId(data.products, i.productId)?.name.toLowerCase() ?? ""}`).join(", ")}.</div> : null}
        </div>
      ) : null}
    </Modal>
  )
}
