/** Returns true when the user message is asking to change site code (not just chatting). */
export function isWorkbenchDeleteRequest(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  if (/\b(delete|remove|unlink)\b/i.test(text)) return true;
  if (/\bnot\s+a\s+folder\b/i.test(text) && /\bfile\s+[\w.-]+/i.test(text)) return true;
  return false;
}

export function isWorkbenchEditRequest(message: string): boolean {
  const text = message.trim();
  if (!text) return false;

  if (isWorkbenchDeleteRequest(text)) return true;

  if (hasEditSignals(text)) return true;

  const stripped = text.replace(/[!?.]+$/g, "").trim();
  if (
    /^(hi|hey|hello|hiya|yo|sup|howdy|thanks?|thank you|thx|ok|okay|cool|nice|great|awesome|bye|goodbye)(\s+there|\s+again)?$/i.test(
      stripped,
    )
  ) {
    return false;
  }

  if (
    /^(what|how|why|when|where|who)\b/i.test(text) ||
    /^(can you|could you)\s+(explain|tell|describe|help me understand)\b/i.test(text)
  ) {
    return false;
  }

  if (/\b(i want|i need|please)\b/i.test(text)) return true;

  // Short messages without edit cues are usually chat.
  if (text.length < 20) return false;

  return false;
}

function hasEditSignals(text: string): boolean {
  if (
    /\b(fix|resolve)\b.*\b(error|bug|compile|build|preview)\b/i.test(text) ||
    /\b(this|the)\s+(error|issue|bug)\b/i.test(text)
  ) {
    return true;
  }

  if (
    /\b(change|make|update|edit|modify|fix|add|remove|delete|set|replace|move|rename|turn|switch|use|apply|insert|hide|show|increase|decrease|darken|lighten|bold|italic|underline|center|align|revert|undo)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  if (
    /\b(color|colour|background|font|header|footer|hero|nav|navbar|menu|button|logo|image|title|heading|copy|section|page|layout|theme|padding|margin|border|shadow|rounded|spacing|width|height|size|modern|minimal|bigger|smaller)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  if (
    /\b(navy|blue|red|green|black|white|gray|grey|purple|pink|orange|yellow|teal|cyan|indigo|slate|emerald|amber)\b/i.test(
      text,
    )
  ) {
    return true;
  }

  return false;
}
