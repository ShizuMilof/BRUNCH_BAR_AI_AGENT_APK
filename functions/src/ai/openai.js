/* eslint-disable require-jsdoc */
async function callOpenAI({apiKey, prompt}) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      input: prompt,
    }),
  });


  const data = await res.json();

  if (!res.ok) {
    console.error("OPENAI STATUS:", res.status);
    console.error("OPENAI ERROR:", JSON.stringify(data, null, 2));
    throw new Error(JSON.stringify(data));
  }

  let text = data.output_text || "";

  if (!text && Array.isArray(data.output)) {
    text = data.output
        .reduce((acc, item) => {
          const content = Array.isArray(item.content) ?
        item.content :
        [];

          return acc.concat(content);
        }, [])
        .map((content) => content.text || "")
        .join("")
        .trim();
  }

  return text;
}

module.exports = {
  callOpenAI,
};
