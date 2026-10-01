import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Fallback to built-in Helvetica font

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#22a86e',
    paddingBottom: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#09291a',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 14,
    color: '#22a86e',
    fontWeight: 'bold',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  contactInfo: {
    alignItems: 'flex-end',
  },
  contactText: {
    fontSize: 9,
    color: '#475569',
    marginBottom: 3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#09291a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    backgroundColor: '#eefbf4',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#22a86e',
  },
  summary: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#334155',
    textAlign: 'justify',
  },
  experienceItem: {
    marginBottom: 12,
  },
  expHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  expPosition: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  expCompany: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#22a86e',
  },
  expDate: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: 'bold',
  },
  expDescription: {
    fontSize: 9.5,
    lineHeight: 1.4,
    color: '#475569',
    marginTop: 4,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillBadge: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  skillText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#334155',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  }
});

interface CVDocumentProps {
  profile: any;
  programName: string;
  skills: { id: number; name: string }[];
}

export const CVDocument: React.FC<CVDocumentProps> = ({ profile, programName, skills }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.name}>{profile.first_name} {profile.last_name}</Text>
            <Text style={styles.title}>{programName}</Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactText}>{profile.email || 'egresado@unicesar.edu.co'}</Text>
            {profile.phone ? <Text style={styles.contactText}>{profile.phone}</Text> : null}
            <Text style={styles.contactText}>Promoción {profile.graduation_year}</Text>
          </View>
        </View>

        {/* Perfil Profesional */}
        {profile.profile_summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Perfil Profesional</Text>
            <Text style={styles.summary}>{profile.profile_summary}</Text>
          </View>
        ) : null}

        {/* Experiencia */}
        {profile.experiences && profile.experiences.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experiencia Laboral</Text>
            {profile.experiences.map((exp: any, index: number) => (
              <View key={index} style={styles.experienceItem}>
                <View style={styles.expHeader}>
                  <Text style={styles.expPosition}>{exp.position}</Text>
                  <Text style={styles.expDate}>
                    {new Date(exp.start_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })} - 
                    {exp.end_date ? new Date(exp.end_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' }) : ' Presente'}
                  </Text>
                </View>
                <Text style={styles.expCompany}>{exp.company_name}</Text>
                {exp.description ? <Text style={styles.expDescription}>{exp.description}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Formación Académica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Formación Académica</Text>
          
          <View style={styles.experienceItem}>
            <View style={styles.expHeader}>
              <Text style={styles.expPosition}>{programName}</Text>
              <Text style={styles.expDate}>{profile.graduation_year}</Text>
            </View>
            <Text style={styles.expCompany}>Universidad Popular del Cesar</Text>
          </View>

          {profile.academic_histories ? profile.academic_histories.map((acad: any, index: number) => (
            <View key={index} style={styles.experienceItem}>
              <View style={styles.expHeader}>
                <Text style={styles.expPosition}>{acad.degree}</Text>
                <Text style={styles.expDate}>
                  {new Date(acad.start_date).getFullYear()} - {acad.end_date ? new Date(acad.end_date).getFullYear() : 'Presente'}
                </Text>
              </View>
              <Text style={styles.expCompany}>{acad.institution}</Text>
            </View>
          )) : null}
        </View>

        {/* Habilidades */}
        {profile.skills && profile.skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Habilidades y Competencias</Text>
            <View style={styles.skillsContainer}>
              {profile.skills.map((s: any, idx: number) => {
                const skillName = skills.find(sk => sk.id === s.skill_id)?.name || `Habilidad ${s.skill_id}`;
                return (
                  <View key={idx} style={styles.skillBadge}>
                    <Text style={styles.skillText}>{skillName}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Generado automáticamente por el Portal de Empleo y Egresados - Universidad Popular del Cesar
        </Text>

      </Page>
    </Document>
  );
};
