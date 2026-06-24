export function encodeCursor(createdAt, id) {
  if (!createdAt || !id) {
    return null;
  }

  const dateStr = createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString();
  const jsonStr = JSON.stringify({ created_at: dateStr, id: Number(id) });
  return Buffer.from(jsonStr).toString('base64');
}

export function decodeCursor(cursorStr) {
  if (!cursorStr) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(cursorStr, 'base64').toString('utf8');
    const decoded = JSON.parse(jsonStr);
    
    if (!decoded.created_at || isNaN(Date.parse(decoded.created_at)) || !decoded.id || isNaN(Number(decoded.id))) {
      return null;
    }
    
    return {
      created_at: decoded.created_at,
      id: Number(decoded.id),
    };
  } catch (error) {
    return null;
  }
}
