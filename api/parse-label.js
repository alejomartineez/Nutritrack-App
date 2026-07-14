// Función serverless de Vercel: recibe la foto de una etiqueta nutricional y le
// pide a Gemini (Google) que la lea y devuelva los datos en JSON. La API key
// vive solo acá, del lado del servidor (variable de entorno GEMINI_API_KEY),
// nunca se expone al navegador.

const GEMINI_MODEL = 'gemini-2.0-flash';

const PROMPT = `Sos un asistente que lee fotos de tablas de información nutricional de productos envasados y devolvés SOLO un JSON válido, sin texto adicional ni bloques de markdown, con esta forma exacta:
{"name": string|null, "gBase": number|null, "kcal": number|null, "protein": number|null, "carbs": number|null, "fat": number|null}

Reglas:
- "name": nombre del producto si se ve en la foto (envase, etiqueta), si no null.
- "gBase": tamaño de la porción/ración base de la tabla, en gramos o mililitros (solo el número, sin unidad ni texto).
- "kcal": calorías (valor energético) correspondientes a esa porción base.
- "protein", "carbs", "fat": proteínas, carbohidratos (o hidratos de carbono) y grasas totales en gramos, correspondientes a esa misma porción base.
- Usá punto como separador decimal (nunca coma).
- Si un dato no es legible o no aparece en la imagen, poné null en ese campo. No inventes ni completes valores que no estén realmente en la foto.
- No confundas la columna de "% VD" con el valor del nutriente: el valor que necesito es la cantidad por porción, no el porcentaje de valores diarios.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY no está configurada en el servidor' });
    return;
  }

  const { image, mimeType } = req.body || {};
  if (!image) {
    res.status(400).json({ error: 'Falta la imagen' });
    return;
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: mimeType || 'image/jpeg', data: image } },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json', temperature: 0 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const detail = await geminiRes.text();
      res.status(502).json({ error: 'Error consultando el modelo de IA', detail });
      return;
    }

    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      res.status(502).json({ error: 'Respuesta vacía del modelo de IA' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      res.status(502).json({ error: 'No se pudo interpretar la respuesta del modelo' });
      return;
    }

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Error inesperado leyendo la etiqueta' });
  }
}
