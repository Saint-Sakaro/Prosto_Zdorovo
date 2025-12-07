import React from 'react';
import { Container } from '../components/common/Container';
import { FormSchemaGenerator } from '../components/admin/FormSchemaGenerator';
import { useNavigate } from 'react-router-dom';

export const AdminSchemas: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <FormSchemaGenerator
        onSchemaCreated={(schema) => {
          console.log('Схема создана:', schema);
          // Можно добавить редирект или показ сообщения
          alert('Схема успешно создана!');
        }}
        onCancel={() => navigate('/moderation')}
      />
    </Container>
  );
};

