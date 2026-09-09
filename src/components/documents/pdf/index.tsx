import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import type { DocProfile } from './theme'
import RequisitionDocument from './RequisitionDocument'
import PurchaseOrderDocument from './PurchaseOrderDocument'
import type { RequisitionDocData } from './RequisitionDocument'
import type { PurchaseOrderDocData } from './PurchaseOrderDocument'

export type { DocProfile }
export type DocKind = 'requisition' | 'purchase'
export type DocData = RequisitionDocData | PurchaseOrderDocData

export function buildDocument(kind: DocKind, data: DocData, profile: DocProfile): ReactElement<DocumentProps> {
  if (kind === 'requisition') return <RequisitionDocument data={data as RequisitionDocData} profile={profile} />
  return <PurchaseOrderDocument data={data as PurchaseOrderDocData} profile={profile} />
}

export function documentMeta(kind: DocKind, data: DocData): { title: string; fileName: string } {
  if (kind === 'requisition') {
    const d = data as RequisitionDocData
    return { title: `Requisition ${d.requisitionNo}`, fileName: `${d.requisitionNo}.pdf` }
  }
  const d = data as PurchaseOrderDocData
  return { title: `Purchase Order ${d.purchaseNo}`, fileName: `${d.purchaseNo}.pdf` }
}
