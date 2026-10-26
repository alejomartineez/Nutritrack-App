import React from 'react';
import { PenLine, FileText, Scale } from 'lucide-react';
import { Sheet, ListGroup, ListRow } from '../ui';

/** Material de referencia del plan: notas, PDFs de la nutri y equivalencias. */
export default function PlanHub({ onClose, onOpen }) {
  return (
    <Sheet title="Mi plan" subtitle="Tu material de referencia, a mano" onClose={onClose} bodyClassName="px-4 pb-6">
      <ListGroup>
        <ListRow icon={FileText} title="PDFs del plan" subtitle="Lo que te pasó tu nutricionista" onClick={() => onOpen('pdfs')} chevron />
        <ListRow icon={PenLine} title="Notas" subtitle="Machetes, recetas, ideas" onClick={() => onOpen('notes')} chevron />
        <ListRow icon={Scale} title="Equivalencias" subtitle="Qué comer para cubrir un macro, o un alimento por otro" onClick={() => onOpen('equiv')} chevron />
      </ListGroup>
    </Sheet>
  );
}
