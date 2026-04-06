import { StyleSheet } from '@react-pdf/renderer'

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111111',
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#7A7060',
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6C161C',
    marginBottom: 8,
  },
  coverCompany: {
    fontSize: 16,
    color: '#111111',
    marginBottom: 4,
  },
  coverMeta: {
    fontSize: 11,
    color: '#7A7060',
    marginBottom: 4,
  },
  coverRule: {
    height: 3,
    backgroundColor: '#6C161C',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C161C',
    marginBottom: 14,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111111',
    marginBottom: 8,
    marginTop: 14,
  },
  calloutBox: {
    border: '2px solid #6C161C',
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  calloutLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: '#7A7060',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  calloutValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E2C49B',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#6C161C',
    padding: 6,
    marginBottom: 0,
  },
  tableHeaderCell: {
    color: '#F0E7D7',
    fontSize: 8,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottom: '1px solid #E4D9C6',
  },
  tableCell: {
    fontSize: 9,
    flex: 1,
    textAlign: 'left',
  },
  tableCellRight: {
    fontSize: 9,
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    padding: 5,
    backgroundColor: '#FAF7F2',
  },
  totalCell: {
    fontSize: 9,
    flex: 1,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 8,
    fontStyle: 'italic',
    color: '#7A7060',
    marginTop: 14,
  },
  yearHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111111',
    marginTop: 14,
    marginBottom: 6,
  },
  docCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6C161C',
    marginTop: 10,
    marginBottom: 4,
  },
  docItem: {
    fontSize: 9,
    color: '#111111',
    marginBottom: 3,
    paddingLeft: 10,
  },
  // Discovery PDF specific
  fieldRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottom: '1px solid #E4D9C6',
  },
  fieldLabel: {
    fontSize: 9,
    color: '#7A7060',
    width: 200,
  },
  fieldValue: {
    fontSize: 9,
    color: '#111111',
    flex: 1,
  },
  indicatorYes: {
    fontSize: 9,
    color: '#004F35',
    fontWeight: 'bold',
  },
  indicatorNo: {
    fontSize: 9,
    color: '#7A7060',
  },
  indicatorNa: {
    fontSize: 9,
    color: '#C4A27A',
  },
})

export function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}
