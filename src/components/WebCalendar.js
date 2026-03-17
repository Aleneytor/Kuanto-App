import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Animated, Platform, useWindowDimensions, Pressable, ScrollView } from 'react-native';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw, Info } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const DAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];
const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WebCalendar = ({ visible, onClose, onSelectDate, selectedDate }) => {
    const { colors, isDark } = useTheme();
    const { width, height } = useWindowDimensions();
    
    // View mode: 'days' | 'months' | 'years'
    const [viewMode, setViewMode] = useState('days');
    
    // View state for navigation (independent of globally selected date until confirmed)
    const [viewDate, setViewDate] = useState(new Date(selectedDate));
    
    // Animations
    const modalScale = React.useRef(new Animated.Value(0.9)).current;
    const modalOpacity = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            setViewDate(new Date(selectedDate));
            setViewMode('days');
            Animated.parallel([
                Animated.spring(modalScale, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(modalOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            modalScale.setValue(0.9);
            modalOpacity.setValue(0);
        }
    }, [visible, selectedDate]);

    const calendarData = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Adjust for Monday start (JS Date uses Sunday = 0)
        let startingDay = firstDayOfMonth - 1;
        if (startingDay === -1) startingDay = 6;
        
        const prevMonthDays = new Date(year, month, 0).getDate();
        
        const weeks = [];
        let days = [];
        
        // Prev month padding
        for (let i = startingDay - 1; i >= 0; i--) {
            days.push({
                day: prevMonthDays - i,
                month: month - 1,
                year: month === 0 ? year - 1 : year,
                currentMonth: false
            });
        }
        
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                month: month,
                year: year,
                currentMonth: true
            });
        }
        
        // Next month padding
        const totalCells = 42; // 6 weeks
        const nextPadding = totalCells - days.length;
        for (let i = 1; i <= nextPadding; i++) {
            days.push({
                day: i,
                month: month + 1,
                year: month === 11 ? year + 1 : year,
                currentMonth: false
            });
        }
        
        for (let i = 0; i < 6; i++) {
            weeks.push(days.slice(i * 7, (i + 1) * 7));
        }
        
        return weeks;
    }, [viewDate]);

    const handlePrevMonth = () => {
        const d = new Date(viewDate);
        d.setDate(1); // Set to 1st to avoid month jump issues (e.g. from Jan 31 jump)
        if (viewMode === 'days') {
            d.setMonth(d.getMonth() - 1);
        } else if (viewMode === 'years') {
            d.setFullYear(d.getFullYear() - 12);
        }
        setViewDate(d);
    };

    const handleNextMonth = () => {
        const d = new Date(viewDate);
        d.setDate(1); // Set to 1st to avoid month jump issues
        if (viewMode === 'days') {
            d.setMonth(d.getMonth() + 1);
        } else if (viewMode === 'years') {
            d.setFullYear(d.getFullYear() + 12);
        }
        setViewDate(d);
    };

    const handleToday = () => {
        const today = new Date();
        onSelectDate(today);
        onClose();
    };

    const handleSelectDay = (dayObj) => {
        const date = new Date(dayObj.year, dayObj.month, dayObj.day);
        onSelectDate(date);
        onClose();
    };

    const handleSelectMonth = (monthIdx) => {
        const d = new Date(viewDate);
        d.setMonth(monthIdx);
        setViewDate(d);
        setViewMode('days');
    };

    const handleSelectYear = (year) => {
        const d = new Date(viewDate);
        d.setFullYear(year);
        setViewDate(d);
        setViewMode('months');
    };

    const renderDaysView = () => (
        <View style={styles.calendarContainer}>
            {/* Days of Week */}
            <View style={styles.daysHeader}>
                {DAYS.map(day => (
                    <Text key={day} style={[styles.dayHeaderText, { color: colors.textSecondary }]}>
                        {day}
                    </Text>
                ))}
            </View>

            {/* Weeks */}
            {calendarData.map((week, wIndex) => (
                <View key={wIndex} style={styles.weekRow}>
                    {week.map((day, dIndex) => {
                        const dayDate = new Date(day.year, day.month, day.day);
                        const isSelected = selectedDate.getDate() === day.day && 
                                         selectedDate.getMonth() === day.month && 
                                         selectedDate.getFullYear() === day.year;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isToday = today.getDate() === day.day && 
                                       today.getMonth() === day.month && 
                                       today.getFullYear() === day.year;
                                       
                        const isFuture = dayDate > today;
                                       
                        return (
                            <TouchableOpacity
                                key={dIndex}
                                onPress={() => !isFuture && handleSelectDay(day)}
                                disabled={isFuture}
                                style={[
                                    styles.dayCell,
                                    isSelected && { backgroundColor: '#02DF82' },
                                    (!day.currentMonth || isFuture) && { opacity: 0.3 }
                                ]}
                            >
                                <Text style={[
                                    styles.dayText, 
                                    { color: capturesColor(isSelected, isToday, day.currentMonth, colors) }
                                ]}>
                                    {day.day}
                                </Text>
                                {isToday && !isSelected && (
                                    <View style={[styles.todayDot, { backgroundColor: '#02DF82' }]} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </View>
    );

    const renderMonthsView = () => (
        <View style={styles.monthsGrid}>
            {MONTHS.map((month, idx) => {
                const isCurrent = viewDate.getMonth() === idx;
                return (
                    <TouchableOpacity
                        key={month}
                        onPress={() => handleSelectMonth(idx)}
                        style={[
                            styles.monthGridItem,
                            isCurrent && { backgroundColor: '#02DF82' }
                        ]}
                    >
                        <Text style={[
                            styles.monthGridText,
                            { color: isCurrent ? '#121214' : colors.textPrimary }
                        ]}>
                            {month.substring(0, 3)}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    const renderYearsView = () => {
        const currentYear = viewDate.getFullYear();
        const startYear = currentYear - (currentYear % 12);
        const years = Array.from({ length: 12 }, (_, i) => startYear + i);

        return (
            <View style={styles.monthsGrid}>
                {years.map(year => {
                    const isCurrent = viewDate.getFullYear() === year;
                    return (
                        <TouchableOpacity
                            key={year}
                            onPress={() => handleSelectYear(year)}
                            style={[
                                styles.monthGridItem,
                                isCurrent && { backgroundColor: '#02DF82' }
                            ]}
                        >
                            <Text style={[
                                styles.monthGridText,
                                { color: isCurrent ? '#121214' : colors.textPrimary }
                            ]}>
                                {year}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    if (Platform.OS !== 'web' && !visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View 
                    style={[
                        styles.backdrop, 
                        { 
                            backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)',
                            opacity: modalOpacity 
                        }
                    ]}
                >
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                </Animated.View>

                <Animated.View style={[styles.container, {
                    backgroundColor: colors.card,
                    borderColor: colors.glassBorder,
                    opacity: modalOpacity,
                    transform: [{ scale: modalScale }]
                }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                        <View style={styles.monthNav}>
                            <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
                                <ChevronLeft size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => setViewMode(viewMode === 'days' ? 'months' : viewMode === 'months' ? 'years' : 'days')}
                                style={styles.titleContainer}
                            >
                                <Text style={[styles.monthText, { color: colors.textPrimary }]}>
                                    {viewMode === 'years' 
                                        ? `${viewDate.getFullYear() - (viewDate.getFullYear() % 12)} - ${viewDate.getFullYear() - (viewDate.getFullYear() % 12) + 11}`
                                        : viewMode === 'months' 
                                            ? viewDate.getFullYear() 
                                            : `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
                                <ChevronRight size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={20} color={colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Main Content */}
                    <View style={{ minHeight: 300 }}>
                        {viewMode === 'days' && renderDaysView()}
                        {viewMode === 'months' && renderMonthsView()}
                        {viewMode === 'years' && renderYearsView()}
                    </View>

                    {/* Footer */}
                    <View style={[styles.footer, { borderTopColor: colors.divider }]}>
                        <TouchableOpacity 
                            onPress={handleToday}
                            style={[styles.todayButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                        >
                            <RotateCcw size={16} color={colors.textPrimary} />
                            <Text style={[styles.todayButtonText, { color: colors.textPrimary }]}>Hoy</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Instruction Bar Integrated with Calendar Style */}
                <Animated.View style={[styles.infoBar, {
                    backgroundColor: colors.card,
                    borderColor: colors.glassBorder,
                    opacity: modalOpacity,
                    transform: [{ 
                        translateY: modalOpacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0]
                        })
                    }]
                }]}>
                    <View style={styles.infoIconWrapper}>
                        <Info size={20} color={isDark ? colors.bcvGreen : '#121214'} strokeWidth={2.5} />
                    </View>
                    <Text style={[styles.infoText, { color: colors.textPrimary }]}>
                        Selecciona una fecha para ver la tasa de ese día.
                    </Text>
                </Animated.View>
            </View>
        </Modal>
    );
};

const capturesColor = (isSelected, isToday, currentMonth, colors) => {
    if (isSelected) return '#121214';
    if (isToday) return '#02DF82';
    return colors.textPrimary;
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        ...Platform.select({
            web: {
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }
        })
    },
    monthsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 12,
        minHeight: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthGridItem: {
        width: '30%',
        aspectRatio: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        margin: '1.5%',
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    monthGridText: {
        fontSize: 14,
        fontWeight: '700',
    },
    titleContainer: {
        minWidth: 140,
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    monthText: {
        fontSize: 16,
        fontWeight: '700',
        minWidth: 120,
        textAlign: 'center',
    },
    navButton: {
        padding: 8,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    closeButton: {
        padding: 8,
        borderRadius: 10,
    },
    calendarContainer: {
        padding: 12,
    },
    daysHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    dayHeaderText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '700',
    },
    weekRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    dayCell: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 2,
    },
    dayText: {
        fontSize: 14,
        fontWeight: '600',
    },
    todayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        position: 'absolute',
        bottom: 6,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        alignItems: 'flex-end',
    },
    todayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    todayButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    infoBar: {
        width: '100%',
        maxWidth: 360,
        marginTop: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        ...Platform.select({
            web: {
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
            }
        })
    },
    infoIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
        lineHeight: 18,
    }
});

export default WebCalendar;
