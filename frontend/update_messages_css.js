const fs = require('fs');
const file = 'C:\\Users\\dashs\\campuselink\\frontend\\src\\app\\dashboard\\messages\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the message rendering block
content = content.replace(
    /messages\.map\(\(msg, idx\) => \{[\s\S]*?\}\)/,
    `messages.map((msg, idx) => {
                    const isMe = Number(msg.sender_id) === Number(user?.id);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div
                          style={{
                            maxWidth: '70%',
                            padding: '8px 16px',
                            fontSize: '14px',
                            borderRadius: '16px',
                            borderBottomRightRadius: isMe ? '0px' : '16px',
                            borderBottomLeftRadius: !isMe ? '0px' : '16px',
                            backgroundColor: isMe ? '#2563eb' : '#e5e7eb',
                            color: isMe ? '#ffffff' : '#1f2937'
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })`
);

fs.writeFileSync(file, content);
console.log('Successfully updated page.tsx with inline styles');
