/**
 * Компонент для массовой загрузки Excel файла
 * Этап 4: Массовая загрузка датасета (для модераторов)
 * Доступен только модераторам
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../auth/Input';
import { bulkUploadPlaces } from '../../api/places';
import { theme } from '../../theme';

const FormContainer = styled(Card)`
  padding: ${({ theme }) => theme.spacing.xl};
  max-width: 800px;
  margin: 0 auto;
`;

const FormTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const FileInputWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const FileInputLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const FileInput = styled.input`
  display: none;
`;

const FileInputButton = styled.label`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 2px dashed ${({ theme }) => theme.colors.border.main};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary.main};
    background: ${({ theme }) => theme.colors.primary.main}10;
    color: ${({ theme }) => theme.colors.primary.main};
  }
`;

const FileName = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.main};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
`;

const FileNameText = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RemoveFileButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.accent.error};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  padding: ${({ theme }) => theme.spacing.xs};
  line-height: 1;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.2);
  }
`;

const CheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.main};
  }
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.primary.main};
`;

const CheckboxLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CheckboxDescription = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const ErrorMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.error};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.accent.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const SuccessMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid ${({ theme }) => theme.colors.accent.success};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  color: ${({ theme }) => theme.colors.accent.success};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const ResultCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.background.main};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const ResultTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ResultGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ResultItem = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background.card};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const ResultValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.primary.main};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const ResultLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorsList = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(239, 68, 68, 0.05);
  border-radius: ${({ theme }) => theme.borderRadius.md};
  max-height: 200px;
  overflow-y: auto;
`;

const ErrorItem = styled.div`
  padding: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.accent.error};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.main};

  &:last-child {
    border-bottom: none;
  }
`;

const CategoriesList = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: rgba(34, 197, 94, 0.05);
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const CategoryItem = styled.div`
  padding: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.accent.success};
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

interface BulkUploadResult {
  total: number;
  created: number;
  errors: number;
  errors_details?: Array<{ message: string; row?: number }>;
  categories_created?: string[];
}

export const BulkUploadForm: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [autoCreateCategories, setAutoCreateCategories] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Проверка расширения файла
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = selectedFile.name
        .substring(selectedFile.name.lastIndexOf('.'))
        .toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        setError('Пожалуйста, выберите файл Excel (.xlsx или .xls)');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Выберите файл для загрузки');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const uploadResult = await bulkUploadPlaces(file, autoCreateCategories);
      setResult(uploadResult);
    } catch (err: any) {
      console.error('Ошибка загрузки:', err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Не удалось загрузить файл'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <FormContainer>
      <FormTitle>Массовая загрузка мест</FormTitle>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {result && result.created > 0 && (
        <SuccessMessage>
          ✅ Успешно загружено {result.created} из {result.total} мест
        </SuccessMessage>
      )}

      <Form onSubmit={handleSubmit}>
        {/* Выбор файла */}
        <FileInputWrapper>
          <FileInputLabel>Excel файл *</FileInputLabel>
          <FileInput
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            id="file-input"
            required
          />
          <FileInputButton htmlFor="file-input">
            <span>📁</span>
            <span>{file ? 'Изменить файл' : 'Выберите файл Excel'}</span>
          </FileInputButton>
          {file && (
            <FileName>
              <FileNameText title={file.name}>
                📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} МБ)
              </FileNameText>
              <RemoveFileButton type="button" onClick={handleRemoveFile}>
                ×
              </RemoveFileButton>
            </FileName>
          )}
        </FileInputWrapper>

        {/* Опция автоматического создания категорий */}
        <CheckboxWrapper>
          <Checkbox
            type="checkbox"
            checked={autoCreateCategories}
            onChange={(e) => setAutoCreateCategories(e.target.checked)}
          />
          <div>
            <CheckboxLabel>Автоматически создавать категории</CheckboxLabel>
            <CheckboxDescription>
              Если категория из файла не существует, она будет создана автоматически
            </CheckboxDescription>
          </div>
        </CheckboxWrapper>

        {/* Кнопка загрузки */}
        <ButtonsRow>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={!file || uploading}
          >
            {uploading ? '⏳ Загрузка...' : '📤 Загрузить'}
          </Button>
        </ButtonsRow>
      </Form>

      {/* Результаты загрузки */}
      {result && (
        <ResultCard>
          <ResultTitle>Результаты загрузки</ResultTitle>
          <ResultGrid>
            <ResultItem>
              <ResultValue>{result.total}</ResultValue>
              <ResultLabel>Всего записей</ResultLabel>
            </ResultItem>
            <ResultItem>
              <ResultValue style={{ color: theme.colors.accent.success }}>
                {result.created}
              </ResultValue>
              <ResultLabel>Создано</ResultLabel>
            </ResultItem>
            {result.errors > 0 && (
              <ResultItem>
                <ResultValue style={{ color: theme.colors.accent.error }}>
                  {result.errors}
                </ResultValue>
                <ResultLabel>Ошибок</ResultLabel>
              </ResultItem>
            )}
          </ResultGrid>

          {/* Список ошибок */}
          {result.errors_details && result.errors_details.length > 0 && (
            <div>
              <h4 style={{ 
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.accent.error,
                marginBottom: theme.spacing.sm
              }}>
                Детали ошибок:
              </h4>
              <ErrorsList>
                {result.errors_details.map((errorDetail, index) => (
                  <ErrorItem key={index}>
                    {errorDetail.row && `Строка ${errorDetail.row}: `}
                    {errorDetail.message}
                  </ErrorItem>
                ))}
              </ErrorsList>
            </div>
          )}

          {/* Созданные категории */}
          {result.categories_created && result.categories_created.length > 0 && (
            <div>
              <h4 style={{ 
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.accent.success,
                marginBottom: theme.spacing.sm
              }}>
                Созданные категории:
              </h4>
              <CategoriesList>
                {result.categories_created.map((cat, index) => (
                  <CategoryItem key={index}>✅ {cat}</CategoryItem>
                ))}
              </CategoriesList>
            </div>
          )}
        </ResultCard>
      )}
    </FormContainer>
  );
};

