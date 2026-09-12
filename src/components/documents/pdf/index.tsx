import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import type { DocProfile } from './theme'
import RequisitionDocument from './RequisitionDocument'
import PurchaseOrderDocument from './PurchaseOrderDocument'
import StockTransferDocument from './StockTransferDocument'
import type { RequisitionDocData } from './RequisitionDocument'
import type { PurchaseOrderDocData } from './PurchaseOrderDocument'
import type { StockTransferDocData } from './StockTransferDocument'

export type { DocProfile }
export type DocKind = 'requisition' | 'purchase' | 'stock-transfer'
export type DocData = RequisitionDocData | PurchaseOrderDocData | StockTransferDocData

export function buildDocument(kind: DocKind, data: DocData, profile: DocProfile): ReactElement<DocumentProps> {
  if (kind === 'requisition') return <RequisitionDocument data={data as RequisitionDocData} profile={profile} />
  if (kind === 'stock-transfer') return <StockTransferDocument data={data as StockTransferDocData} profile={profile} />
  return <PurchaseOrderDocument data={data as PurchaseOrderDocData} profile={profile} />
}

export function documentMeta(kind: DocKind, data: DocData): { title: string; fileName: string } {
  if (kind === 'requisition') {
    const d = data as RequisitionDocData
    return { title: `Requisition ${d.requisitionNo}`, fileName: `${d.requisitionNo}.pdf` }
  }
  if (kind === 'stock-transfer') {
    const d = data as StockTransferDocData
    return { title: `Stock Transfer ${d.transferNo}`, fileName: `${d.transferNo}.pdf` }
  }
  const d = data as PurchaseOrderDocData
  return { title: `Purchase Order ${d.purchaseNo}`, fileName: `${d.purchaseNo}.pdf` }
}
