import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Send and retrieve messages between users
    Args: event with httpMethod (GET for retrieve, POST for send)
    Returns: HTTP response with messages or send confirmation
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    if method == 'GET':
        params = event.get('queryStringParameters', {}) or {}
        user_id = params.get('userId')
        
        if not user_id:
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'User ID required'}),
                'isBase64Encoded': False
            }
        
        cur.execute("""
            SELECT DISTINCT m.id, m.from_user_id, m.content, m.is_broadcast, m.created_at,
                   u.first_name, u.last_name, u.display_name,
                   mr.to_user_id
            FROM messages m
            JOIN users u ON m.from_user_id = u.id
            JOIN message_recipients mr ON m.id = mr.message_id
            WHERE m.from_user_id = %s OR mr.to_user_id = %s
            ORDER BY m.created_at ASC
        """, (user_id, user_id))
        
        messages = cur.fetchall()
        
        result = {}
        for msg in messages:
            msg_id = msg[0]
            if msg_id not in result:
                result[msg_id] = {
                    'id': msg_id,
                    'fromUserId': msg[1],
                    'content': msg[2],
                    'isBroadcast': msg[3],
                    'timestamp': msg[4].isoformat() if msg[4] else None,
                    'fromUserName': msg[7] or msg[5],
                    'to': []
                }
            result[msg_id]['to'].append(msg[8])
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(list(result.values())),
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        from_user_id = body_data.get('fromUserId')
        to_user_ids = body_data.get('toUserIds', [])
        content = body_data.get('content')
        is_broadcast = body_data.get('isBroadcast', False)
        
        if not all([from_user_id, to_user_ids, content]):
            cur.close()
            conn.close()
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing required fields'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            "INSERT INTO messages (from_user_id, content, is_broadcast) VALUES (%s, %s, %s) RETURNING id",
            (from_user_id, content, is_broadcast)
        )
        message_id = cur.fetchone()[0]
        
        for to_user_id in to_user_ids:
            cur.execute(
                "INSERT INTO message_recipients (message_id, to_user_id) VALUES (%s, %s)",
                (message_id, to_user_id)
            )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'id': message_id, 'success': True}),
            'isBase64Encoded': False
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }
