import React from 'react'
import { ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native'
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Quote,
    Code
} from 'lucide-react-native'

type Props = {
    onCommand: (method: string, args?: any[]) => void
}

const ToolbarButton = ({ icon: Icon, onPress }: { icon: any, onPress: () => void }) => (
    <TouchableOpacity style={styles.button} onPress={onPress}>
        <Icon size={20} color="#333" />
    </TouchableOpacity>
)

export const EditorToolbar = ({ onCommand }: Props) => {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <ToolbarButton icon={Bold} onPress={() => onCommand('toggleBold')} />
                <ToolbarButton icon={Italic} onPress={() => onCommand('toggleItalic')} />
                <ToolbarButton icon={Underline} onPress={() => onCommand('toggleUnderline')} />
                <View style={styles.divider} />
                <ToolbarButton icon={Heading1} onPress={() => onCommand('toggleHeading', [{ level: 1 }])} />
                <ToolbarButton icon={Heading2} onPress={() => onCommand('toggleHeading', [{ level: 2 }])} />
                <View style={styles.divider} />
                <ToolbarButton icon={List} onPress={() => onCommand('toggleBulletList')} />
                <ToolbarButton icon={ListOrdered} onPress={() => onCommand('toggleOrderedList')} />
                <View style={styles.divider} />
                <ToolbarButton icon={Quote} onPress={() => onCommand('toggleBlockquote')} />
                <ToolbarButton icon={Code} onPress={() => onCommand('toggleCodeBlock')} />
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        height: 48,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    scrollContent: {
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    button: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 2,
        borderRadius: 4,
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: '#eee',
        marginHorizontal: 8,
    },
})
