import React from 'react';
import { View, Text } from 'react-native';
import { fontFamily } from '../constants/theme';

function parseInline(str, baseStyle, keyPrefix) {
    const segments = [];
    const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
    let lastIndex = 0;
    let match;
    let i = 0;

    while ((match = regex.exec(str)) !== null) {
        if (match.index > lastIndex) {
            segments.push(
                <Text key={`${keyPrefix}-t${i++}`} style={baseStyle}>
                    {str.slice(lastIndex, match.index)}
                </Text>
            );
        }
        if (match[1] !== undefined) {
            segments.push(
                <Text key={`${keyPrefix}-b${i++}`} style={[baseStyle, { fontFamily: fontFamily.bold }]}>
                    {match[1]}
                </Text>
            );
        } else {
            segments.push(
                <Text key={`${keyPrefix}-i${i++}`} style={[baseStyle, { fontStyle: 'italic' }]}>
                    {match[2]}
                </Text>
            );
        }
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < str.length) {
        segments.push(
            <Text key={`${keyPrefix}-t${i++}`} style={baseStyle}>
                {str.slice(lastIndex)}
            </Text>
        );
    }

    return segments.length > 0 ? segments : [<Text key={`${keyPrefix}-t0`} style={baseStyle}>{str}</Text>];
}

export default function MarkdownText({ text, style }) {
    if (!text) return null;

    const lines = text.split('\n');

    return (
        <View>
            {lines.map((line, index) => {
                if (!line.trim()) {
                    return <View key={index} style={{ height: 6 }} />;
                }

                const headingMatch = line.match(/^#{1,3}\s+(.+)/);
                if (headingMatch) {
                    return (
                        <Text key={index} style={[style, { fontFamily: fontFamily.semibold, marginTop: 4, marginBottom: 2 }]}>
                            {parseInline(headingMatch[1], style, `h${index}`)}
                        </Text>
                    );
                }

                const bulletMatch = line.match(/^[-•*]\s+(.+)/);
                if (bulletMatch) {
                    return (
                        <View key={index} style={{ flexDirection: 'row', marginVertical: 1, alignItems: 'flex-start' }}>
                            <Text style={[style, { marginRight: 5, lineHeight: 22 }]}>•</Text>
                            <Text style={[style, { flex: 1 }]}>
                                {parseInline(bulletMatch[1], style, `b${index}`)}
                            </Text>
                        </View>
                    );
                }

                const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
                if (numberedMatch) {
                    return (
                        <View key={index} style={{ flexDirection: 'row', marginVertical: 1, alignItems: 'flex-start' }}>
                            <Text style={[style, { marginRight: 4, lineHeight: 22, fontFamily: fontFamily.medium }]}>
                                {numberedMatch[1]}.
                            </Text>
                            <Text style={[style, { flex: 1 }]}>
                                {parseInline(numberedMatch[2], style, `n${index}`)}
                            </Text>
                        </View>
                    );
                }

                return (
                    <Text key={index} style={style}>
                        {parseInline(line, style, `p${index}`)}
                    </Text>
                );
            })}
        </View>
    );
}
